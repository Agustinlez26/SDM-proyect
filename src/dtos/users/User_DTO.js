export class User_DTO {
    constructor(user) {
            this.id = user.id;
            this.full_name = user.full_name;
            this.email = user.email;
            this.is_admin = user.is_admin;
            this.phone = user.phone;
            this.branch = user.branch;
            this.is_active = user.is_active;
    }
}