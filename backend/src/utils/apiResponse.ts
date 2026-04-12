import type { Response } from 'express';

/**
 * Pagination utility to standardize list results
 * @param {Array} data - The data items for the current page
 * @param {number} totalCount - The total number of items in the DB for the query
 * @param {number} page - Current page number
 * @param {number} limit - Number of items per page
 * @returns {object} paginated result object
 */
export const paginate = <T>(data: T[], totalCount: number, page: number, limit: number) => {
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
export const successResponse = (res: Response, data: unknown = {}, message = 'Operation successful', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};
