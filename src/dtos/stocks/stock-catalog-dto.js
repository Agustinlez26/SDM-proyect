export class StockCatalogDTO {
    constructor(stock) {
        this.id = stock.stock_id;
        this.product_id = stock.product_id;
        this.name = stock.name;
        this.sku = stock.sku;
        this.img = stock.img;
        this.quantity = stock.quantity
        this.available_quantity = stock.quantity
        this.physical_quantity = stock.physical_quantity ?? stock.quantity
        this.reserved_quantity = stock.reserved_quantity ?? 0
    }
}
