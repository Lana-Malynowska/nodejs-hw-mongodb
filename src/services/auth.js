import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import createHttpError from 'http-errors';

import { User } from '../db/models/user.js';
import { Session } from '../db/models/session.js';
import { FIFTEEN_MINUTES, THIRTY_DAYS } from '../constants/index.js';
import { Types } from 'mongoose';

export const registerUser = async (payload) => {
  const user = await User.findOne({ email: payload.email });
  if (user) throw createHttpError(409, 'Email is in use');

  const encryptedPassword = await bcrypt.hash(payload.password, 10);

  return await User.create({
    ...payload,
    password: encryptedPassword,
  });
};

export const loginUser = async (payload) => {
  const user = await User.findOne({ email: payload.email });
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const isEqual = await bcrypt.compare(payload.password, user.password);
  if (!isEqual) {
    throw createHttpError(401, 'Unauthorized');
  }

  // await Session.deleteOne({ userId: user._id });
  await Session.deleteOne({ userId: user._id.toString() });

  const accessToken = randomBytes(30).toString('base64');
  const refreshToken = randomBytes(30).toString('base64');

  return await Session.create({
    // userId: user._id,
    userId: user._id.toString(),
    accessToken,
    refreshToken,
    accessTokenValidUntil: new Date(Date.now() + FIFTEEN_MINUTES),
    refreshTokenValidUntil: new Date(Date.now() + THIRTY_DAYS),
  });
};

const createSession = () => {
  const accessToken = randomBytes(30).toString('base64');
  const refreshToken = randomBytes(30).toString('base64');

  return {
    accessToken,
    refreshToken,
    accessTokenValidUntil: new Date(Date.now() + FIFTEEN_MINUTES),
    refreshTokenValidUntil: new Date(Date.now() + THIRTY_DAYS),
  };
};

export const refreshUserSession = async ({ sessionId, refreshToken }) => {
  if (!Types.ObjectId.isValid(sessionId)) {
    throw createHttpError(401, 'Session not found');
  }

  const session = await Session.findOne({
    _id: new Types.ObjectId(sessionId),
    refreshToken,
  });

  if (!session) {
    throw createHttpError(401, 'Session not found');
  }

  const isSessionTokenExpired =
    new Date() > new Date(session.refreshTokenValidUntil);

  if (isSessionTokenExpired) {
    throw createHttpError(401, 'Session token expired');
  }

  const newSession = createSession();

  await Session.deleteOne({ _id: sessionId, refreshToken });

  return await Session.create({
    userId: session.userId,
    ...newSession,
  });
};

export const logoutUser = async (sessionId) => {
  if (!Types.ObjectId.isValid(sessionId)) return;

  await Session.deleteOne({ _id: new Types.ObjectId(sessionId) });
};
