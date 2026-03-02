export class MovementDetailsDTO {
    constructor(data) {
        this.id = data.id
        this.quantity = Number(data.quantity)

        this.product = {
            name: data.product_name,
            barcode: data.cod_bar,
            image: data.product_img
        }
    }
}