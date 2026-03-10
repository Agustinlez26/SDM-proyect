export class UserProfileDTO {
    constructor(user) {
        this.id = user.id;
        this.full_name = user.full_name;
        this.email = user.email;
        this.branch = user.branch;
    }
}
