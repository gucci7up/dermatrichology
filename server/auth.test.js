import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret-for-auth-selfcheck';
const { hashPassword, verifyPassword, signToken, verifyToken } = await import('./auth.js');

const hash = await hashPassword('correct horse battery staple');
assert.equal(await verifyPassword('correct horse battery staple', hash), true, 'correct password should verify');
assert.equal(await verifyPassword('wrong password', hash), false, 'wrong password should not verify');

const token = signToken({ id: 'user-1', role: 'admin' });
const decoded = verifyToken(token);
assert.equal(decoded.id, 'user-1');
assert.equal(decoded.role, 'admin');

const tampered = token.slice(0, -1) + (token.at(-1) === 'a' ? 'b' : 'a');
assert.throws(() => verifyToken(tampered), 'tampered token must throw');

console.log('auth.js self-check passed');
