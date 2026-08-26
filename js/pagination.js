export const DEFAULT_PAGE_SIZE = 20;

export function paginate(items, requestedPage = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(Math.max(Number(requestedPage) || 1, 1), totalPages);
    const start = (currentPage - 1) * pageSize;

    return {
        currentPage,
        totalPages,
        items: items.slice(start, start + pageSize),
    };
}
