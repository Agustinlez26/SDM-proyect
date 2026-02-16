export class ShipmentsDTO {
    constructor(data){
        this.id = data.id
        this.status = data.status
        this.receipt_number = data.receipt_number
        this.branch = data.branch
        this.date = data.date
    }
}