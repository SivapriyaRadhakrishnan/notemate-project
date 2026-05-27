import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";
import { Bell, BellRing, Clock } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch notifications
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);

      // 2. Mark all as read
      if (data && data.some(n => !n.read)) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Bell className="text-violet-500" />
            Notifications
          </h1>
          <p className="mt-2 text-white/50">
            View assignment updates, escrow holds, and platform alerts.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          {loading ? (
            <div className="text-xs text-white/40 text-center py-8">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-white/40 flex flex-col items-center gap-3">
              <BellRing size={32} className="text-white/20" />
              <span>No notifications yet. You'll receive alerts for major assignment updates.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl p-5 border transition-all duration-300 flex items-start gap-4 ${
                    !item.read
                      ? "bg-violet-600/5 border-violet-500/20 text-white"
                      : "bg-[#0B1120]/50 border-white/5 text-white/80"
                  }`}
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!item.read ? "bg-violet-500 animate-pulse" : "bg-white/10"}`} />
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      {item.title}
                      {!item.read && (
                        <span className="bg-violet-500/10 text-violet-400 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                          New
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">{item.message}</p>
                    
                    <div className="flex items-center gap-1 mt-3 text-[10px] text-white/30">
                      <Clock size={10} />
                      <span>
                        {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Notifications;
