/**
 * Pagination middleware for API responses
 * Provides consistent pagination across all endpoints
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;

/**
 * Parse and validate pagination parameters
 */
function parsePaginationParams(req, res, next) {
  const { page, limit, offset } = req.query;
  
  // Parse page and limit
  let parsedPage = parseInt(page) || DEFAULT_PAGE;
  let parsedLimit = parseInt(limit) || DEFAULT_LIMIT;
  let parsedOffset = parseInt(offset) || 0;
  
  // Validate and constrain values
  parsedPage = Math.max(1, parsedPage);
  parsedLimit = Math.min(Math.max(1, parsedLimit), MAX_LIMIT);
  
  // Calculate offset from page if page is provided and offset is not
  if (page && !offset) {
    parsedOffset = (parsedPage - 1) * parsedLimit;
  }
  
  // Add pagination info to request
  req.pagination = {
    page: parsedPage,
    limit: parsedLimit,
    offset: parsedOffset
  };
  
  next();
}

/**
 * Generate pagination metadata for responses
 */
function generatePaginationMeta(page, limit, totalItems, baseUrl = '') {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  const meta = {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage
  };
  
  // Add navigation URLs if baseUrl is provided
  if (baseUrl) {
    meta.links = {
      self: `${baseUrl}?page=${page}&limit=${limit}`,
      first: `${baseUrl}?page=1&limit=${limit}`,
      last: `${baseUrl}?page=${totalPages}&limit=${limit}`
    };
    
    if (hasNextPage) {
      meta.links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
    }
    
    if (hasPrevPage) {
      meta.links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
    }
  }
  
  return meta;
}

/**
 * Create paginated response helper
 */
function createPaginatedResponse(data, totalItems, pagination, baseUrl = '') {
  const meta = generatePaginationMeta(
    pagination.page,
    pagination.limit,
    totalItems,
    baseUrl
  );
  
  return {
    success: true,
    data,
    pagination: meta
  };
}

/**
 * Middleware to add pagination helpers to response object
 */
function addPaginationHelpers(req, res, next) {
  // Add helper method to response object
  res.paginate = function(data, totalItems, baseUrl = '') {
    const response = createPaginatedResponse(data, totalItems, req.pagination, baseUrl);
    return this.json(response);
  };
  
  next();
}

/**
 * Generate SQL LIMIT and OFFSET clause
 */
function getSQLPagination(pagination) {
  return {
    limit: pagination.limit,
    offset: pagination.offset,
    sql: `LIMIT ${pagination.limit} OFFSET ${pagination.offset}`
  };
}

/**
 * Apply pagination to array (for in-memory pagination)
 */
function paginateArray(array, pagination) {
  const start = pagination.offset;
  const end = start + pagination.limit;
  return array.slice(start, end);
}

/**
 * Validate pagination parameters for specific use cases
 */
function validatePaginationLimits(maxLimit = MAX_LIMIT) {
  return (req, res, next) => {
    if (req.pagination && req.pagination.limit > maxLimit) {
      return res.status(400).json({
        success: false,
        message: `Limit cannot exceed ${maxLimit} items per page`,
        error: 'PAGINATION_LIMIT_EXCEEDED'
      });
    }
    next();
  };
}

/**
 * Cache-aware pagination for frequently accessed data
 */
function getCacheKeyForPagination(baseKey, pagination, additionalParams = {}) {
  const params = {
    page: pagination.page,
    limit: pagination.limit,
    ...additionalParams
  };
  
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
    
  return `${baseKey}:${Buffer.from(paramString).toString('base64')}`;
}

module.exports = {
  parsePaginationParams,
  addPaginationHelpers,
  generatePaginationMeta,
  createPaginatedResponse,
  getSQLPagination,
  paginateArray,
  validatePaginationLimits,
  getCacheKeyForPagination,
  DEFAULT_LIMIT,
  MAX_LIMIT
};