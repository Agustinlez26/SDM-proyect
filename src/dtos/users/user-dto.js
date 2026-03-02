export class UserDTO {
    constructor(user) {
            this.id = user.id;
            this.full_name = user.full_name;
            this.email = user.email;
            this.branch = user.branch;
            this.is_admin = user.is_admin;
            this.is_active = user.is_active;
    }
}