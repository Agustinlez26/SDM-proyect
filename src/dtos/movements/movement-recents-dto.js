export class MovementRecentsDTO {
    constructor(movement){
        this.id = movement.id
        this.type = movement.type
        this.egress_reason = movement.egress_reason
        this.date = movement.date
        this.status = movement.status
        this.receipt_number = movement.receipt_number
    }
}
