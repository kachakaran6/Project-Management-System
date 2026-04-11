/**
 * Pagination utility to standardize list results
 * @param {Array} data - The data items for the current page
 * @param {number} totalCount - The total number of items in the DB for the query
 * @param {number} page - Current page number
 * @param {number} limit - Number of items per page
 * @returns {object} paginated result object
 */
export const paginate = (data, totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    items: data,
    meta: {
      totalItems: totalCount,
      itemCount: data.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPreviousPage
    }
  };
};

/**
 * Standard success response format
 */
export const successResponse = (res, data = {}, message = 'Operation successful', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};
