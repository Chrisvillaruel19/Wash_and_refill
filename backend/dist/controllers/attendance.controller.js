export const timeIn = (req, res) => {
    return res.json({ message: "Time in controller working", body: req.body });
};
export const timeOut = (req, res) => {
    return res.json({ message: "Time out controller working", body: req.body });
};
export const currentAttendance = (req, res) => {
    return res.json({ message: "Current attendance controller working" });
};
export const attendanceHistory = (req, res) => {
    return res.json({ message: "Attendance history controller working" });
};
export const attendanceSummary = (req, res) => {
    return res.json({ message: "Attendance summary controller working" });
};
//# sourceMappingURL=attendance.controller.js.map