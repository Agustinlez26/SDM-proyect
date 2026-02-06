export class BranchDTO {
    constructor(branch){
        this.id = branch.id
        this.name = branch.name
        this.address = branch.address
        this.city = branch.city
        this.province = branch.province
        this.type = branch.type
        this.is_active = branch.is_active
    }
}