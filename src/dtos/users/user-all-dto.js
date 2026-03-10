export class UserAllDTO {
    constructor(user) {
        this.id = user.id;
        this.full_name = user.full_name;
        this.branch = user.branch;
        this.is_admin = user.is_admin;
        this.is_active = user.is_active;
    }
}
