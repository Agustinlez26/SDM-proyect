export class Stock_DTO {
    constructor(stock){
        this.id = stock.id,
        this.cod_bar = stock.cod_bar,
        this.name = stock.name,
        this.branch = stock.branch,
        this.img = stock.img,
        this.quantity = stock.quantity,
        this.min_quantity = stock.min_quantity
    }
}