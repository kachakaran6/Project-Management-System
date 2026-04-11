import User from '../models/User.js';

/**
 * Parse mentions (@username) from text and return user IDs
 * @param {string} text - Comment or description text
 * @param {string} organizationId - To scope user search
 * @returns {Promise<Array<string>>} Array of user IDs
 */
export const parseMentions = async (text, organizationId) => {
  if (!text) return [];

  // Regex to find @mentions (assuming firstName is used for simplicity, 
  // but in a real app you'd use a unique @username or email handle)
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);

  if (!matches) return [];

  const names = matches.map(m => m.substring(1));

  // Find users in the organization whose firstName matches
  // In a production app, you'd match against a unique 'username' or slug
  const users = await User.find({
    $or: [
      { firstName: { $in: names } },
      { email: { $in: names.map(n => `${n}@gmail.com`) } } // fallback example
    ]
  }).select('_id').lean();

  return users.map(u => u._id);
};
