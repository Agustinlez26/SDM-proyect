export class AuthDTO {
    constructor(input) {
        this.id = input.id;
            this.full_name = input.full_name;
            this.email = input.email;
            this.password = input.password
            this.is_admin = input.is_admin;
            this.phone = input.phone;
            this.branch_id = input.branch_id;
            this.is_active = input.is_active;
            this.requires_password_change = input.requires_password_change;
    }
}
