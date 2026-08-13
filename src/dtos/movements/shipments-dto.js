export class ShipmentsDTO {
    constructor(data){
        this.id = data.id
        this.status = data.status
        this.receipt_number = data.receipt_number
        this.origin_branch_id = data.origin_branch_id
        this.destination_branch_id = data.destination_branch_id
        this.origin_branch_name = data.origin_branch_name
        this.destination_branch_name = data.destination_branch_name
        this.branch = data.destination_branch_name
        this.date = data.date
    }
}
