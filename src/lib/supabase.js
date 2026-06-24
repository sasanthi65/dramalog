import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key in .env file");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
};

// Drama helpers
// Drama helpers
export const getDramas = async () => {
  const { data, error } = await supabase
    .from("dramas")
    .select("*")
    .order("created_at", { ascending: false });
  return { data, error };
};

export const addDrama = async (dramaData) => {
  const { data, error } = await supabase
    .from("dramas")
    .insert([dramaData])
    .select();
  return { data, error };
};

export const updateDrama = async (dramaId, updates) => {
  const { data, error } = await supabase
    .from("dramas")
    .update(updates)
    .eq("id", dramaId)
    .select();
  return { data, error };
};

export const deleteDrama = async (dramaId) => {
  const { error } = await supabase.from("dramas").delete().eq("id", dramaId);
  return { error };
};
