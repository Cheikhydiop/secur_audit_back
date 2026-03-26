import { PrismaClient } from '@prisma/client';

export async function paginateOrFindAll<T extends keyof PrismaClient>(
  prisma: PrismaClient,
  modelName: T,
  options?: {
    page?: number;
    limit?: number;
    cursor?: any;
    findOptions?: any;
  }
) {
  const model = prisma[modelName] as any;
  
  if (!model || typeof model.findMany !== 'function' || typeof model.count !== 'function') {
    throw new Error(`Le modèle ${String(modelName)} n'existe pas ou ne supporte pas findMany/count.`);
  }

  const { page, limit = 10, cursor, findOptions = {} } = options || {};

  // Pagination par curseur (infinite scroll)
  if (cursor) {
    const items = await model.findMany({
      take: limit + 1,
      cursor: cursor,
      skip: 1,
      ...findOptions,
    });

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, -1) : items;
    const nextCursor = hasNextPage ? { id: data[data.length - 1].id } : null;

    return {
      data,
      nextCursor,
      hasNextPage,
      paginated: true,
    };
  }

  // CORRECTION : Pagination classique - condition plus explicite
  const shouldPaginate = typeof page === 'number' && page >= 1;
  
  if (shouldPaginate) {
    console.log(`🔍 Pagination activée - Page: ${page}, Limit: ${limit}`);
    
    const skip = (page - 1) * limit;
    
    const [data, total] = await prisma.$transaction([
      model.findMany({
        skip,
        take: limit,
        ...findOptions,
      }),
      model.count({ where: findOptions.where }),
    ]);

    const lastPage = Math.ceil(total / limit) || 1;
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + limit, total);

    console.log(`📊 Résultat pagination - Total: ${total}, Page: ${page}/${lastPage}, Items: ${data.length}`);

    return {
      data,
      total,
      page,
      perPage: limit,
      lastPage,
      from,
      to,
      hasNextPage: page < lastPage,
      hasPreviousPage: page > 1,
      paginated: true,
    };
  }

  // Fallback : récupérer tout (seulement si aucune pagination n'est demandée)
  console.log('⚠️ ATTENTION: Récupération de TOUS les éléments sans pagination');
  const data = await model.findMany(findOptions);
  return {
    data,
    total: data.length,
    paginated: false,
  };
}