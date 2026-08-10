export class ProductCatalogDTO {
    constructor(row) {
        this.id = row.id
        this.name = row.name
        this.sku = row.sku
        this.url_img_small = row.url_img_small
        this.is_registered = row.is_registered === 1
    }
}
