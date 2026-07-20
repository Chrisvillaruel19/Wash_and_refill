export const login = (req, res) => {
    return res.json({
        message: "Login controller working",
        body: req.body,
    });
};
export const register = (req, res) => {
    return res.json({
        message: "Register controller working",
        body: req.body,
    });
};
export const logout = (req, res) => {
    return res.json({
        message: "Logout controller working",
    });
};
export const forgotPassword = (req, res) => {
    return res.json({
        message: "Forgot password controller working",
        body: req.body,
    });
};
export const verifyOtp = (req, res) => {
    return res.json({
        message: "Verify OTP controller working",
        body: req.body,
    });
};
export const resetPassword = (req, res) => {
    return res.json({
        message: "Reset password controller working",
        body: req.body,
    });
};
//# sourceMappingURL=auth.controller.js.map