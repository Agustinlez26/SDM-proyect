export class MovementDetailsDTO {
    constructor(data) {
        this.id = data.id
        this.quantity = Number(data.quantity)

        this.product = {
            id: data.product_id,
            name: data.product_name,
            sku: data.sku,
            image: data.product_img
        }
    }
}
