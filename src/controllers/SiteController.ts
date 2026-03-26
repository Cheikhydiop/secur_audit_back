import { Request, Response } from 'express';
import { SiteService } from '../services/SiteService.js';
import { Container } from 'typedi';

export class SiteController {
    private get siteService() {
        return Container.get(SiteService);
    }

    // GET /api/sites
    getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const { region, search, page, limit, status } = req.query;
            
            // Parse pagination params
            const pageNum = page ? parseInt(page as string) : 1;
            const limitNum = limit ? parseInt(limit as string) : 12;
            
            const data = await this.siteService.findAll({
                region: region as string,
                search: search as string,
                status: status as string,
                page: pageNum,
                limit: limitNum
            });
            
            // Format response to match frontend expectations
            res.json({ 
                success: true, 
                data: {
                    data: data.data,
                    total: data.pagination.total,
                    page: data.pagination.page,
                    lastPage: data.pagination.totalPages,
                    perPage: data.pagination.limit
                }
            });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/sites/:id
    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.siteService.findById(req.params['id'] as string);
            if (!data) { res.status(404).json({ success: false, message: 'Site non trouvé' }); return; }
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // POST /api/sites
    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.siteService.create(req.body);
            res.status(201).json({ success: true, data, message: 'Site créé' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // PUT /api/sites/:id
    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.siteService.update(req.params['id'] as string, req.body);
            res.json({ success: true, data, message: 'Site mis à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // DELETE /api/sites/:id
    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.siteService.delete(req.params['id'] as string);
            res.json({ success: true, message: 'Site supprimé' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // GET /api/sites/search?q=query - Quick search for autocomplete
    quickSearch = async (req: Request, res: Response): Promise<void> => {
        try {
            const { q, limit } = req.query;
            const data = await this.siteService.quickSearch(q as string, limit ? parseInt(limit as string) : 10);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // POST /api/sites/import
    importCsv = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.siteService.importCsv(req.body.csvData);
            res.json({ success: true, ...result, message: `${result.imported} sites importés` });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };
}

