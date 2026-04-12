import bcrypt from 'bcryptjs';

/**
 * Hash a password with bcrypt
 * @param {string} password - Raw password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare raw and hashed password
 * @param {string} password - Raw password
 * @param {string} hashedPassword - Hashed password from DB
 * @returns {Promise<boolean>} Match result
 */
export const comparePassword = async (password: string, hashedPassword: string) => {
  return bcrypt.compare(password, hashedPassword);
};
