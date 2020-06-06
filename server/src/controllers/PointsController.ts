import { Request, Response } from 'express';
import knex from '../database/conection';

class PointsController{

    async index(request:Request, response:Response){
        const { city, uf, items} = request.query;

        const parsedItems = String(items)
            .split(',')
            .map( item => Number(item.trim())) ;


        const points = await knex('points')
            .join('point_items', 'points.id', '=', 'point_items.point_id' )
            .whereIn('point_items.item_id', parsedItems)
            .where( 'city', String(city))
            .where( 'uf', String(uf))
            .distinct()
            .select('points.*');

        const serializedPoint = points.map( point => {
            return{
                ...point,
                image_url: `http://192.168.0.103:3333/uploads/${point.image}`
            };
        });
        return response.json(points);

    }

    async show(request:Request, response:Response){
        const {id} = request.params;

        const point = await knex('points').where('id', id).first();

        if( !point ){
            return response.status(400).json({message: "Point not found"});
        }

        const serializedPoint = {
            ...point,
            image_url: `http://192.168.0.103:3333/uploads/${point.image}`
        };

        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title');

        return response.json( {point: serializedPoint, items} );
    }

    async create( request: Request, response: Response){
        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body;

        const point = {
            //image:'https://images.unsplash.com/photo-1557223562-6c77ef16210f?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80',//onibus
            // image:'https://images.unsplash.com/photo-1505246053330-ecd82cf55f18?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=134&q=80', //espaço aberto
            // image: 'https://images.unsplash.com/photo-1556767576-5ec41e3239ea?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=400&q=60',
            // image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=167&q=80',
            image: request.file.filename,
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf
        };
        const trx = await knex.transaction();

        const insertedIds = await trx('points').insert( point );

        const point_id = insertedIds[0];

        const pointItems  = items
            .split(',')
            .map((item:string) => Number(item.trim()))
            .map((item_id:number) => {
                return {
                    item_id,
                    point_id
                }
            });

        await trx('point_items').insert(pointItems);

        await trx.commit();

        return response.json({
            id: point_id,
            ...point
        });
    }
}

export default PointsController;