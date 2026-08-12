export class StockDTO {
    constructor(stock){
        this.id = stock.id;
        this.branch_id = stock.branch_id;
        this.cod_bar = stock.cod_bar;
        this.name = stock.name;
        this.branch = stock.branch;
        this.img = stock.img;
        this.quantity = stock.quantity;
        this.physical_quantity = stock.physical_quantity;
        this.reserved_quantity = stock.reserved_quantity || 0;
        this.min_quantity = stock.min_quantity
    }
}
