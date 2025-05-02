import { Elysia, t } from 'elysia'
import { deviceController } from '../controllers/deviceController'

const paramsWithId = t.Object({ id: t.Numeric() }) // Use Numeric for automatic conversion/validation

export default new Elysia({ prefix: '/devices' })
  .post('', deviceController.create, {
    detail: {
      summary: 'Create a new device',
      tags: ['Devices'],
      description: 'Adds a new device to the system.',
      body: { description: 'Device details: name, brand, and state (available, in-use, inactive).' },
      responses: {
        201: { description: 'Device created successfully' },
        400: { description: 'Invalid input data' },
        500: { description: 'Internal server error' }
      }
    }
  })
  .get('', deviceController.getAll, {
    query: t.Object({
      brand: t.Optional(t.String({ minLength: 1 })),
      state: t.Optional(t.String({
        enum: ['available', 'in-use', 'inactive'],
        error: "State must be one of 'available', 'in-use', 'inactive'"
      }))
    }),
    detail: {
      summary: 'Fetch all devices',
      tags: ['Devices'],
      description: 'Retrieves a list of all devices, optionally filtered by brand and/or state.',
      parameters: [
        { in: 'query', name: 'brand', schema: { type: 'string' }, description: 'Filter devices by brand name.' },
        { in: 'query', name: 'state', schema: { type: 'string', enum: ['available', 'in-use', 'inactive'] }, description: 'Filter devices by state.' }
      ],
      responses: {
        200: { description: 'List of devices' },
        500: { description: 'Internal server error' }
      }
    }
  })
  .get('/:id', deviceController.getById, {
    params: paramsWithId,
    detail: {
      summary: 'Fetch a single device by ID',
      tags: ['Devices'],
      description: 'Retrieves the details of a specific device using its unique ID.',
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'The unique identifier of the device.' }
      ],
      responses: {
        200: { description: 'Device details' },
        400: { description: 'Invalid device ID format' },
        404: { description: 'Device not found' },
        500: { description: 'Internal server error' }
      }
    }
  })
  .patch('/:id', deviceController.update, {
    params: paramsWithId,
    detail: {
      summary: 'Partially update a device',
      tags: ['Devices'],
      description: 'Updates one or more properties of an existing device. Name and brand cannot be updated if the device state is "in-use".',
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'The unique identifier of the device to update.' }
      ],
      body: { description: 'Fields to update (name, brand, state). At least one field must be provided.' },
      responses: {
        200: { description: 'Device updated successfully' },
        400: { description: 'Invalid input data or business rule violation (e.g., updating name/brand while in-use)' },
        404: { description: 'Device not found' },
        500: { description: 'Internal server error' }
      }
    }
  })
  .delete('/:id', deviceController.delete, {
    params: paramsWithId,
    detail: {
      summary: 'Delete a device',
      tags: ['Devices'],
      description: 'Removes a device from the system. Devices currently "in-use" cannot be deleted.',
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'The unique identifier of the device to delete.' }
      ],
      responses: {
        204: { description: 'Device deleted successfully' },
        400: { description: 'Invalid device ID format or business rule violation (e.g., deleting an in-use device)' },
        404: { description: 'Device not found' },
        500: { description: 'Internal server error' }
      }
    }
  })