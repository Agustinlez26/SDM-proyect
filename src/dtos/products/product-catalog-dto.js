export class ProductCatalogDTO {
    constructor(row) {
        this.id = row.id
        this.name = row.name
        this.cod_bar = row.cod_bar
        this.url_img_small = row.url_img_small
        this.is_registered = row.is_registered === 1
    }
}