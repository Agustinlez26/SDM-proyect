export class MovementDTO {
    constructor(data) {
        this.id = data.id
        this.receipt_number = data.receipt_number
        this.type = data.type
        this.status = data.status
        this.date = data.effective_date || data.date
        this.created_at = data.date

        this.origin = data.origin_branch
        this.destination = data.destination_branch
        this.origin_branch_id = data.origin_branch_id
        this.destination_branch_id = data.destination_branch_id

        this.user = {
            id: data.user_id,
            name: data.user_name
        }
    }
}