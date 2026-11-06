const pool = require("../config/db");

const getEmployeeIdForUser = async (userId) => {
    const result = await pool.query(
        `SELECT COALESCE(
             u.linked_employee_id,
             (SELECT e.id FROM employees e WHERE e.user_id = u.id)
         ) AS employee_id
         FROM users u
         WHERE u.id = $1`,
        [userId]
    );
    return result.rows[0]?.employee_id ? Number(result.rows[0].employee_id) : null;
};

module.exports = { getEmployeeIdForUser };
