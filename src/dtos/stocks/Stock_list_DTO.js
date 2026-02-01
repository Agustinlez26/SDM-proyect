export class Stock_list_DTO {
    constructor(stock){
        this.id = stock.id;
        this.name = stock.name;
        this.cod_bar = stock.cod_bar;
        this.img = stock.img;
        this.quantity = stock.quantity
    }
}