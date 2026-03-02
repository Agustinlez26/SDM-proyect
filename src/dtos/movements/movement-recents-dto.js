export class MovementRecentsDTO {
    constructor(movement){
        this.id = movement.id
        this.type = movement.type
        this.date = movement.date
        this.status = movement.status
        this.receipt_number = movement.receipt_number
    }
}