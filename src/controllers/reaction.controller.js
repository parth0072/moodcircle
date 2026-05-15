const crypto = require('crypto');
const { reactions, moods, groups } = require('../stores');
const { ok, fail } = require('../utils/response');

const ALLOWED_REACTIONS = ['sending_love', 'same', 'rooting_for_you', 'hang_in_there', 'so_happy_for_you'];

// POST /moods/:moodId/reactions
function addReaction(req, res) {
  const { moodId } = req.params;
  const { type } = req.body;
  const userId = req.user.id;

  const mood = moods.get(moodId);
  if (!mood) return fail(res, 'Mood post not found', 'MOOD_NOT_FOUND', 404);

  // Verify requester is in the same group
  const group = groups.get(mood.groupId);
  if (!group || !group.members.includes(userId)) {
    return fail(res, 'You are not a member of this group', 'NOT_MEMBER', 403);
  }

  // One reaction of the same type per user per mood
  const duplicate = [...reactions.values()].find(
    (r) => r.moodId === moodId && r.userId === userId && r.type === type
  );
  if (duplicate) {
    return fail(res, 'You have already reacted with this type', 'DUPLICATE_REACTION', 409);
  }

  const id = crypto.randomUUID();
  const reaction = { id, moodId, userId, type, createdAt: new Date().toISOString() };
  reactions.set(id, reaction);

  return ok(res, { reaction }, 201);
}

// DELETE /moods/:moodId/reactions/:reactionId
function removeReaction(req, res) {
  const { moodId, reactionId } = req.params;
  const userId = req.user.id;

  const reaction = reactions.get(reactionId);
  if (!reaction) return fail(res, 'Reaction not found', 'REACTION_NOT_FOUND', 404);
  if (reaction.moodId !== moodId) return fail(res, 'Reaction does not belong to this mood', 'MISMATCH', 400);
  if (reaction.userId !== userId) return fail(res, 'You can only remove your own reactions', 'FORBIDDEN', 403);

  reactions.delete(reactionId);
  return ok(res, { message: 'Reaction removed' });
}

module.exports = { addReaction, removeReaction };
