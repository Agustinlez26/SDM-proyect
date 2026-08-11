export class UserDTO {
    constructor(user) {
            this.id = user.id;
            this.full_name = user.full_name;
            this.email = user.email;
            this.branch = user.branch;
            this.is_admin = user.is_admin;
            this.app_role = user.app_role;
            this.area = user.area;
            this.branch_ids = user.branch_ids ? String(user.branch_ids).split(',').map(Number) : [user.branch_id];
            this.is_active = user.is_active;
    }
}
