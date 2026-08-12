export const canViewAllStock = user => Boolean(
    user && (
        user.is_admin ||
        user.app_role === 'admin' ||
        user.app_role === 'stock_manager' ||
        (user.app_role === 'seller' && user.area === 'wholesale')
    )
)

