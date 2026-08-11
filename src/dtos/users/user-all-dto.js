export class UserAllDTO {
    constructor(user) {
        this.id = user.id;
        this.full_name = user.full_name;
        this.branch = user.branch;
        this.is_admin = user.is_admin;
        this.app_role = user.app_role;
        this.area = user.area;
        this.allowed_branches = user.allowed_branches;
        this.is_active = user.is_active;
    }
}
