export function isCurrentUser(user, currentUser) {
  if (!user || !currentUser) return false;

  const uid = user.userId || user._id || user.id;
  const cid = currentUser.userId || currentUser._id || currentUser.id;
  if (uid && cid) return String(uid) === String(cid);

  if (user.email && currentUser.email) return user.email.toLowerCase() === currentUser.email.toLowerCase();

  return false;
}
