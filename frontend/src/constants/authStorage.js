// Auth token lives in an httpOnly cookie now (not readable by JS), so there is
// no token key here anymore. Only the non-sensitive user profile is persisted.
export const AUTH_USER_KEY = 'ft_auth_user'
