import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "../../supabase/client";
import { useAuth } from "../../context/auth-context";
import {
  Send,
  Image,
  User,
  MessageSquare,
  Clock,
  Paperclip,
} from "lucide-react";

interface ProfileMap {
  [key: string]: string;
}

interface Message {
  id: string;
  assignment_id: string;
  sender_id: string;
  text: string;
  image_url?: string;
  created_at: string;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  status: string;
  user_id: string;
  writer_id: string;
  deadline?: string;
}

const Messages = () => {
  const { profile } = useAuth();
  const [activeOrders, setActiveOrders] = useState<Assignment[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Assignment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  
  // Loading & Ref states
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ----------------------------- */
  /* LOAD ACTIVE ORDERS & PROFILES */
  /* ----------------------------- */

  const fetchOrdersAndProfiles = useCallback(async () => {
    try {
      setLoadingOrders(true);
      setErrorMessage("");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile?.role) return;

      // 1. Fetch profiles to resolve names
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) throw profilesError;
      
      const map: ProfileMap = {};
      profilesData?.forEach((p) => {
        map[p.id] = p.full_name;
      });
      setProfiles(map);

      // 2. Fetch assignments that have a writer (active chat channels)
      let query = supabase
        .from("assignments")
        .select("id,title,subject,status,user_id,writer_id,deadline")
        .not("writer_id", "is", null);

      if (profile?.role === "customer") {
        query = query.eq("user_id", user.id);
      } else if (profile?.role === "writer") {
        query = query.eq("writer_id", user.id);
      }

      const { data: assignmentsData, error } = await query;
      if (error) throw error;

      const assignments: Assignment[] = (assignmentsData || []).map((item) => ({
        id: String(item.id),
        title: String(item.title),
        subject: String(item.subject),
        status: String(item.status),
        user_id: String(item.user_id),
        writer_id: String(item.writer_id),
        deadline: item.deadline ? String(item.deadline) : undefined,
      }));

      setActiveOrders(assignments);
    } catch (err) {
      console.error("Error loading chat orders:", err);
      setErrorMessage(err instanceof Error ? err.message : "Unable to load chat channels.");
    } finally {
      setLoadingOrders(false);
    }
  }, [profile?.role]);

  useEffect(() => {
    fetchOrdersAndProfiles();
  }, [fetchOrdersAndProfiles]);

  /* ----------------------------- */
  /* LOAD MESSAGES & REALTIME */
  /* ----------------------------- */

  const fetchMessages = useCallback(async (assignmentId: string) => {
    try {
      setLoadingMessages(true);
      setErrorMessage("");
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Unable to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedOrder) return;

    fetchMessages(selectedOrder.id);

    // Subscribe to messages insert events for real-time chat updates
    const messageChannel = supabase
      .channel(`chat:${selectedOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `assignment_id=eq.${selectedOrder.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicate appends
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [fetchMessages, selectedOrder]);

  /* ----------------------------- */
  /* SEND MESSAGE */
  /* ----------------------------- */

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || (!newMessage.trim() && !attachment)) return;

    try {
      setSending(true);
      setErrorMessage("");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isParticipant =
        selectedOrder.user_id === user.id || selectedOrder.writer_id === user.id;

      if (!isParticipant) {
        setErrorMessage("You are not a participant in this chat.");
        return;
      }

      let attachedUrl = "";

      // Handle chat image/file attachment upload
      if (attachment) {
        const fileExt = attachment.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("assignments")
          .upload(fileName, attachment);

        if (uploadError) {
          alert("Attachment upload failed: " + uploadError.message);
          setSending(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("assignments")
          .getPublicUrl(fileName);

        attachedUrl = publicUrl;
      }

      const { error } = await supabase.from("messages").insert([
        {
          assignment_id: selectedOrder.id,
          sender_id: user.id,
          text: newMessage.trim(),
          image_url: attachedUrl || null,
        },
      ]);

      if (error) {
        setErrorMessage("Failed to send message: " + error.message);
        return;
      }

      setNewMessage("");
      setAttachment(null);
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-3xl border border-white/10 bg-[#081120] backdrop-blur-xl">
        
        {/* Left Side: Chat Channels (Active Orders) */}
        <div className="w-80 shrink-0 border-r border-white/10 flex flex-col bg-[#050B14]">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-violet-400" />
              Active Chats
            </h2>
            <p className="text-xs text-white/40 mt-1">Select an order to start messaging</p>
            {errorMessage && (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loadingOrders ? (
              <div className="text-xs text-white/40 text-center py-8">Loading channels...</div>
            ) : activeOrders.length === 0 ? (
              <div className="text-xs text-white/30 text-center py-8 px-4 leading-relaxed">
                No active writer chats found. Post tasks or accept assignments to start chatting.
              </div>
            ) : (
              activeOrders.map((order) => {
                const partnerId = profile?.role === "customer" ? order.writer_id : order.user_id;
                const partnerName = profiles[partnerId] || "Loading...";
                
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-2 ${
                      selectedOrder?.id === order.id
                        ? "bg-violet-600/10 border-violet-500 text-white"
                        : "bg-white/5 border-transparent text-white/70 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-xs font-black truncate max-w-[120px]">{order.title}</span>
                      <span className="text-[9px] font-bold uppercase text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                      <User size={10} className="text-white/30" />
                      <span>{partnerName}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat Box */}
        <div className="flex-1 flex flex-col bg-[#070E1A]">
          {selectedOrder ? (
            <>
              {/* Chat Header */}
              <div className="p-5 border-b border-white/10 bg-[#060C16] flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-sm font-black text-white">{selectedOrder.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                    <span className="capitalize">{selectedOrder.subject}</span>
                    <span>•</span>
                    <span>Chatting with: <strong className="text-white/70">{profiles[profile?.role === "customer" ? selectedOrder.writer_id : selectedOrder.user_id] || "Partner"}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5 text-[10px] font-semibold text-white/50">
                  <Clock size={12} className="text-violet-400" />
                  <span>Due Date: {selectedOrder.deadline}</span>
                </div>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="text-xs text-white/40 text-center py-8">Loading message history...</div>
                ) : messages.length === 0 ? (
                  <div className="text-xs text-white/30 text-center py-12 flex flex-col items-center gap-2">
                    <MessageSquare size={24} className="text-white/20" />
                    <span>Send a message to coordinate instructions or clarify task details.</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.sender_id === profile?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[70%] ${isSelf ? "ml-auto items-end" : "mr-auto items-start"}`}
                      >
                        <div
                          className={`rounded-2xl p-4 text-sm leading-relaxed ${
                            isSelf
                              ? "bg-violet-600 text-white rounded-tr-none shadow-lg shadow-violet-600/10"
                              : "bg-white/5 border border-white/10 text-white/90 rounded-tl-none"
                          }`}
                        >
                          {msg.text && <p>{msg.text}</p>}
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="Attachment"
                              className="max-w-xs max-h-48 rounded-xl object-cover mt-2 border border-white/10"
                            />
                          )}
                        </div>
                        <span className="text-[9px] text-white/30 mt-1 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Toolbar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#060C16] shrink-0 space-y-3">
                {attachment && (
                  <div className="flex items-center justify-between bg-violet-600/10 border border-violet-500/20 rounded-xl p-2 text-xs">
                    <div className="flex items-center gap-2 text-violet-400">
                      <Paperclip size={14} />
                      <span className="truncate max-w-[200px]">{attachment.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* File Attachment Uploader */}
                  <label className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 cursor-pointer transition-all duration-300">
                    <Image size={18} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAttachment(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 h-12 rounded-2xl border border-white/10 bg-[#030712] px-5 text-sm text-white outline-none focus:border-violet-500"
                  />

                  <button
                    type="submit"
                    disabled={sending || (!newMessage.trim() && !attachment)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white hover:bg-violet-500 transition-all duration-300 disabled:opacity-40"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40">
              <MessageSquare size={48} className="text-white/10 mb-4" />
              <h3 className="text-lg font-bold text-white/60">No Chat Channel Selected</h3>
              <p className="text-xs text-white/30 max-w-sm mt-2">
                Click on any of your active assignments in the left panel to coordinate with your writer or Customer .
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default Messages;
