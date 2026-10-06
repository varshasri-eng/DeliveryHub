import { useState, useEffect } from "react";
import {
  FiUsers, FiUserPlus, FiLink, FiCopy, FiCheck, FiInfo,
  FiLogOut, FiUser, FiStar, FiShield,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  getMyHousehold, createHousehold, joinHousehold, leaveHousehold,
} from "../../api/households";

export default function FamilyGroup() {
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const load = () =>
    getMyHousehold()
      .then((res) => setHousehold(res.data.household))
      .catch(() => toast.error("Failed to load family group."))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!createName.trim()) return toast.error("Give your group a name.");
    setCreating(true);
    try {
      const res = await createHousehold(createName.trim());
      setHousehold(res.data.household);
      toast.success("Family group created!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not create group.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return toast.error("Enter the invite code.");
    setJoining(true);
    try {
      const res = await joinHousehold(joinCode.trim());
      setHousehold(res.data.household);
      toast.success(`Joined ${res.data.household.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not join group.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this family group?")) return;
    try {
      await leaveHousehold();
      setHousehold(null);
      toast.success("You left the family group.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not leave group.");
    }
  };

  const handleCopyId = () => {
    if (!household?.invite_code) return;
    navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Header />
        <div className="card text-center py-12 text-gray-400">Loading family group…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Header />

      {household ? (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                <FiUsers className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{household.name}</p>
                <p className="text-xs text-gray-400">Family Group · #{household.id}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Invite code</p>
                <p className="font-mono font-semibold text-gray-800 tracking-widest">
                  {household.invite_code}
                </p>
              </div>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-600
                           hover:text-brand-700 transition-colors">
                {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <p className="text-sm text-gray-500 mt-4 flex items-start gap-2">
              <FiInfo size={14} className="mt-0.5 flex-shrink-0 text-brand-400" />
              Share this invite code with family members so they can join your household.
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Members</h3>
            <div className="space-y-2">
              {household.members.map((m) => (
                <div key={m.customer_id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center
                                  flex-shrink-0 text-brand-600 font-bold text-sm">
                    {(m.name || m.phone || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400 truncate">{m.email || m.phone}</p>
                  </div>
                  {m.role === "head" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium
                                     text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      <FiShield size={10} /> Head
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium
                                     text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                      <FiUser size={10} /> Member
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleLeave}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium
                       text-red-500 bg-red-50 hover:bg-red-100 py-2.5 rounded-xl transition-colors">
            <FiLogOut size={14} /> Leave family group
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card text-center py-10">
            <div className="inline-flex items-center justify-center w-14 h-14
                            bg-brand-50 rounded-2xl mb-4">
              <FiUsers className="text-brand-500 text-2xl" />
            </div>
            <h3 className="text-gray-800 font-semibold mb-1">Not in a group yet</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              Create a family group or join one with an invite code to coordinate
              account access with your household.
            </p>
          </div>

          {/* Create */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <FiUserPlus className="text-brand-500" size={15} />
              </span>
              <h3 className="font-semibold text-gray-800 text-sm">Create a group</h3>
            </div>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="e.g. Reddy Family"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <button
                className="btn-primary flex-shrink-0"
                onClick={handleCreate}
                disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>

          {/* Join */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <FiLink className="text-green-500" size={15} />
              </span>
              <h3 className="font-semibold text-gray-800 text-sm">Join with invite code</h3>
            </div>
            <div className="flex gap-2">
              <input
                className="input font-mono uppercase tracking-widest"
                placeholder="ABC123"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <button
                className="btn-primary flex-shrink-0"
                onClick={handleJoin}
                disabled={joining}>
                {joining ? "Joining…" : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Family Group</h1>
      <p className="text-gray-500 text-sm mt-0.5">
        Share account access with family members in your household
      </p>
    </div>
  );
}
