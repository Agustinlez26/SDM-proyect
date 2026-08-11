export class ProductListDTO {
    constructor(row) {
        this.id = row.id;
        this.name = row.name; 
        this.sku = row.sku;
        this.description = row.description;
        this.category = row.category;
        this.url_img_small = row.url_img_small;
        this.item_type = row.item_type;
        this.is_sellable = Boolean(row.is_sellable);
        this.is_manufacturable = Boolean(row.is_manufacturable);
        this.is_customizable = Boolean(row.is_customizable);
        this.production_method = row.production_method;
    }
}
