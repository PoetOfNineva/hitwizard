// ============================================================
// HITWIZARD AUTH SYSTEM — MILITARY GRADE
// Supabase Auth + Google + Facebook + Discord + Email
// Cloud History + Cloud Characters + User Profiles
// ============================================================

const HW_SUPABASE_URL = "https://vklwiqbglmhyjuenysal.supabase.co";
const HW_SUPABASE_KEY = "sb_publishable_LijIXwSajzD2LygTl5-MtQ_p0mTznkS";

// ── CLEAR LOCAL USER DATA ──
// Called on sign-out to prevent data bleed between users on the same browser.
function clearLocalUserData() {
  const keys = Object.keys(localStorage).filter(k =>
    k.startsWith("hw_") || k.startsWith("supabase.")
  );
  keys.forEach(k => localStorage.removeItem(k));
  console.log("[HitWizard] Local user data cleared on sign-out.");
}

// ── SUPABASE CLIENT ──
let _sb = null;
function getSB() {
  if (_sb) return _sb;
  if (!window.supabase) { console.error("Supabase not loaded"); return null; }
  _sb = window.supabase.createClient(HW_SUPABASE_URL, HW_SUPABASE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: "hw_auth_session"
    }
  });
  return _sb;
}

// ── AUTH STATE ──
window.HW_AUTH = {
  user: null,
  profile: null,
  session: null,
  listeners: [],
  ready: false,

  onChange(fn) { this.listeners.push(fn); },
  emit() { this.listeners.forEach(fn => fn(this.user, this.profile)); },

  isLoggedIn() { return !!this.user; },
  isFree() { return !this.profile || this.profile.tier === "free"; },
  isCaptain() { return this.profile && ["captain","admiral","fleet_commander"].includes(this.profile.tier); },

  async init() {
    const sb = getSB();
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      this.session = session;
      this.user = session.user;
      await this.loadProfile();
    }
    this.ready = true;
    this.emit();

    sb.auth.onAuthStateChange(async (event, session) => {
      this.session = session;
      this.user = session?.user || null;
      if (this.user) {
        await this.loadProfile();
        await this.syncLocalDataToCloud();
        // Fire event so React components reload their cloud data
        window.dispatchEvent(new CustomEvent("hw_user_signed_in", { detail: { user: this.user } }));
      } else {
        this.profile = null;
        // Fire event so React components clear their state
        window.dispatchEvent(new CustomEvent("hw_user_signed_out"));
      }
      this.emit();
      if (event === "SIGNED_IN") {
        await this.syncLocalDataToCloud();
      }
      // Send welcome email on first signup only
      if (event === "SIGNED_UP" && this.user) {
        try {
          await fetch("/.netlify/functions/send-welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: this.user.email,
              name: this.user.user_metadata?.full_name || "",
              type: this.user.app_metadata?.provider || "email"
            })
          });
        } catch(e) {
          console.warn("Welcome email failed:", e);
        }
      }
    });
  },

  async loadProfile() {
    if (!this.user) return;
    const sb = getSB();
    const { data, error } = await sb.from("profiles").select("*").eq("id", this.user.id).single();
    if (!error && data) this.profile = data;
  },

  async syncLocalDataToCloud() {
    if (!this.user) return;
    try {
      await this.syncHistoryToCloud();
      await this.syncCharactersToCloud();
    } catch(e) { console.warn("Sync error:", e); }
  },

  async syncHistoryToCloud() {
    const sb = getSB();
    if (!sb || !this.user) return;
    const local = localStorage.getItem("hw_history");
    if (!local) return;
    const items = JSON.parse(local);
    if (!items.length) return;
    const { data: existing } = await sb.from("history").select("id").eq("user_id", this.user.id).limit(1);
    if (existing && existing.length) return; // already has cloud history
    const rows = items.map(item => ({
      user_id: this.user.id,
      type: item.type || "campaign",
      icon: item.icon || "⚡",
      title: item.title || "Untitled",
      sub: item.sub || "",
      color: item.color || "var(--gold)",
      result: (() => { try { return localStorage.getItem("hw_result_" + item.id) ? JSON.parse(localStorage.getItem("hw_result_" + item.id)) : null; } catch(e) { return null; } })()
    }));
    await sb.from("history").insert(rows);
  },

  async syncCharactersToCloud() {
    const sb = getSB();
    if (!sb || !this.user) return;
    const local = localStorage.getItem("hw_characters");
    if (!local) return;
    const chars = JSON.parse(local);
    if (!chars.length) return;
    const { data: existing } = await sb.from("characters").select("id").eq("user_id", this.user.id).limit(1);
    if (existing && existing.length) return;
    const rows = chars.map((c, i) => ({
      user_id: this.user.id,
      name: c.name || "Character",
      role: c.role || "Supporting",
      emoji: c.emoji || "🧑",
      dna: c.dna || "",
      tag: c.tag || "",
      color: c.color || "#FFB800",
      sort_order: i
    }));
    await sb.from("characters").insert(rows);
  },

  async signInWithGoogle() {
    const sb = getSB();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://hitwizardai.com/auth/callback" }
    });
  },

  async signInWithFacebook() {
    const sb = getSB();
    await sb.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: "https://hitwizardai.com/auth/callback" }
    });
  },

  async signInWithDiscord() {
    const sb = getSB();
    await sb.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: "https://hitwizardai.com/auth/callback" }
    });
  },

  async signInWithEmail(email, password) {
    const sb = getSB();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUpWithEmail(email, password, fullName) {
    const sb = getSB();
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const sb = getSB();
    await sb.auth.signOut();
    this.user = null;
    this.profile = null;
    this.session = null;
    // Clear ALL user data from localStorage on sign-out
    // so the next person who opens this browser sees a clean slate
    clearLocalUserData();
    this.emit();
  },

  async deleteAccount() {
    if (!this.user) throw new Error("Not signed in");
    const sb = getSB();
    const userId = this.user.id;
    // Delete all user data from Supabase tables first
    await Promise.all([
      sb.from("history").delete().eq("user_id", userId),
      sb.from("characters").delete().eq("user_id", userId),
      sb.from("song_vault").delete().eq("user_id", userId),
      sb.from("usage_logs").delete().eq("user_id", userId),
      sb.from("campaign_tracking").delete().eq("user_id", userId),
      sb.from("profiles").delete().eq("id", userId)
    ]);
    // Sign out and clear local data
    await sb.auth.signOut();
    this.user = null;
    this.profile = null;
    this.session = null;
    clearLocalUserData();
    this.emit();
    // Note: deleting the Supabase Auth user itself requires the service role key
    // which is server-side only. We handle this via a Netlify function call.
    try {
      await fetch("/.netlify/functions/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
    } catch(e) {
      console.warn("Server-side account deletion failed:", e);
    }
  },

  async resetPassword(email) {
    const sb = getSB();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: "https://hitwizardai.com/auth/reset"
    });
    if (error) throw error;
  }
};

// ── CLOUD HISTORY ──
window.HW_HISTORY = {
  async save(item) {
    if (!window.HW_AUTH.isLoggedIn()) return;
    const sb = getSB();
    const { data, error } = await sb.from("history").insert({
      user_id: window.HW_AUTH.user.id,
      type: item.type,
      icon: item.icon,
      title: item.title,
      sub: item.sub,
      color: item.color,
      result: item.result || null
    }).select().single();
    if (error) console.error("History save error:", error);
    return data;
  },

  async load(limit = 50) {
    if (!window.HW_AUTH.isLoggedIn()) return null;
    const sb = getSB();
    const { data, error } = await sb.from("history")
      .select("*")
      .eq("user_id", window.HW_AUTH.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) { console.error("History load error:", error); return null; }
    return data;
  },

  async delete(id) {
    if (!window.HW_AUTH.isLoggedIn()) return;
    const sb = getSB();
    await sb.from("history").delete().eq("id", id).eq("user_id", window.HW_AUTH.user.id);
  },

  async clearAll() {
    if (!window.HW_AUTH.isLoggedIn()) return;
    const sb = getSB();
    await sb.from("history").delete().eq("user_id", window.HW_AUTH.user.id);
  }
};

// ── CLOUD CHARACTERS ──
window.HW_CHARS = {
  async load() {
    if (!window.HW_AUTH.isLoggedIn()) return null;
    const sb = getSB();
    const { data, error } = await sb.from("characters")
      .select("*")
      .eq("user_id", window.HW_AUTH.user.id)
      .order("sort_order", { ascending: true });
    if (error) { console.error("Characters load error:", error); return null; }
    return data;
  },

  async save(char) {
    if (!window.HW_AUTH.isLoggedIn()) return;
    const sb = getSB();
    if (char.id && !char.id.startsWith("char_")) {
      const { data, error } = await sb.from("characters").update({
        name: char.name, role: char.role, emoji: char.emoji,
        dna: char.dna, tag: char.tag, color: char.color
      }).eq("id", char.id).eq("user_id", window.HW_AUTH.user.id).select().single();
      if (error) console.error("Character update error:", error);
      return data;
    } else {
      const { data, error } = await sb.from("characters").insert({
        user_id: window.HW_AUTH.user.id,
        name: char.name, role: char.role, emoji: char.emoji,
        dna: char.dna, tag: char.tag, color: char.color,
        sort_order: Date.now()
      }).select().single();
      if (error) console.error("Character insert error:", error);
      return data;
    }
  },

  async delete(id) {
    if (!window.HW_AUTH.isLoggedIn()) return;
    const sb = getSB();
    await sb.from("characters").delete().eq("id", id).eq("user_id", window.HW_AUTH.user.id);
  }
};

// ── USAGE TRACKING (anti-abuse) ──
window.HW_USAGE = {
  async log(action, metadata = {}) {
    if (!window.HW_AUTH.isLoggedIn()) return;
    const sb = getSB();
    await sb.from("usage_logs").insert({
      user_id: window.HW_AUTH.user.id,
      action,
      metadata,
      ip_hash: null
    });
  },

  async checkLimit(action) {
    if (!window.HW_AUTH.user) return true;
    const profile = window.HW_AUTH.profile;
    if (!profile) return true;
    if (["captain","admiral","fleet_commander"].includes(profile.tier)) return true;
    const limits = { campaign: 3, pitch: 5, content: 5, epk: 1, hook: 3, budget: 3, video: 2 };
    const limit = limits[action] || 99;
    const field = action + "_used";
    return (profile[field] || 0) < limit;
  }
};

// ── ANALYTICS ──
window.HW_ANALYTICS = {
  async logCampaign(data) {
    if (!window.HW_AUTH.isLoggedIn()) return;
    const sb = getSB();
    await sb.from("campaign_tracking").insert({
      user_id: window.HW_AUTH.user.id,
      song_title: data.songTitle || "Unknown",
      platform: data.platform || "meta",
      budget_spent: data.budget || 0,
      start_date: new Date().toISOString().split("T")[0]
    });
  },

  async getDashboardStats() {
    if (!window.HW_AUTH.isLoggedIn()) return null;
    const sb = getSB();
    const userId = window.HW_AUTH.user.id;
    const [history, campaigns, chars] = await Promise.all([
      sb.from("history").select("type, created_at").eq("user_id", userId),
      sb.from("campaign_tracking").select("*").eq("user_id", userId),
      sb.from("characters").select("id").eq("user_id", userId)
    ]);
    return {
      history: history.data || [],
      campaigns: campaigns.data || [],
      charCount: (chars.data || []).length
    };
  }
};

// ── INIT ON LOAD ──
document.addEventListener("DOMContentLoaded", () => {
  window.HW_AUTH.init().then(() => {
    window.dispatchEvent(new CustomEvent("hw_auth_ready"));
  });
});
