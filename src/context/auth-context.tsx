import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "../supabase/client";

interface Profile {
  id: string;
  full_name: string;
  role: "customer" | "writer" | "admin";
  verified: boolean;
  writer_status?: "pending" | "approved" | "rejected";
  avatar_url?: string;
  college_id_key?: string;
  phone?: string;
  bio?: string;
  available_balance: number;
  rating: number;
  rating_count: number;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType>({
    session: null,
    profile: null,
    loading: true,
    refreshProfile: async () => {},
  });

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [session, setSession] =
    useState<Session | null>(null);
  const [profile, setProfile] =
    useState<Profile | null>(null);
  const [loading, setLoading] =
    useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // If not found, let's check metadata or create one
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userRole = user.user_metadata?.role || "customer";
          const newProfile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || "",
            role: userRole as "customer" | "writer" | "admin",
            verified: userRole !== "writer",
            writer_status: userRole === "writer" ? "pending" : "approved",
            avatar_url: user.user_metadata?.avatar_url || null,
            college_id_key: user.user_metadata?.college_id_key || null,
            phone: user.user_metadata?.phone || "",
            bio: user.user_metadata?.bio || "",
            available_balance: 0,
            rating: 0,
            rating_count: 0
          };
          
          const { error: insertError } = await supabase
            .from("profiles")
            .insert([newProfile]);
          
          if (!insertError) {
            setProfile(newProfile as Profile);
          }
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (data.session?.user) {
          fetchProfile(data.session.user.id).finally(() => {
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);
