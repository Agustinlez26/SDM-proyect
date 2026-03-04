export class StockCatalogDTO {
    constructor(stock) {
        this.id = stock.stock_id;
        this.product_id = stock.product_id;
        this.name = stock.name;
        this.cod_bar = stock.cod_bar;
        this.img = stock.img;
        this.quantity = stock.quantity
    }
}