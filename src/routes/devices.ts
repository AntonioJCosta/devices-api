import { Elysia, t } from 'elysia'
import { deviceController } from '../controllers/deviceController'


/**
 * Defines a reusable validation schema for routes expecting a numeric ID parameter.
 */
const paramsWithId = t.Object({ id: t.Numeric() })

/**
 * Defines the routes for the /devices endpoint.
 */
export default new Elysia({ prefix: '/devices' })
  // POST /devices - Create a new device
  .post('', deviceController.create, {
    detail: {
      summary: 'Create a new device',
      tags: ['Devices'],
      description: 'Adds a new device to the system. Requires name, brand, and state.',
      body: { description: 'Device details: name (string, min 5), brand (string, enum), and state (enum).' },
      responses: {
        201: { description: 'Device created successfully' },
        400: { description: 'Invalid input data (validation error)' },
        409: { description: 'Conflict - Device name already exists' },
        500: { description: 'Internal server error' }
      }
    }
  })
  // GET /devices - Fetch all devices with optional filtering
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
        { in: 'query', name: 'brand', schema: { type: 'string', enum: ['Apple', 'Samsung', 'Google', 'Sony', 'Huawei'] }, description: 'Filter devices by brand.' },
        { in: 'query', name: 'state', schema: { type: 'string', enum: ['available', 'in-use', 'inactive'] }, description: 'Filter devices by state.' }
      ],
      responses: {
        200: { description: 'List of devices' },
        500: { description: 'Internal server error' }
      }
    }
  })
  // GET /devices/:id - Fetch a single device by ID
  .get('/:id', deviceController.getById, {
    params: paramsWithId, // Use shared ID validation schema
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
    // PUT /devices/:id - Fully update (replace) a device
    .put('/:id', deviceController.updateFull, {
      params: paramsWithId,
      // Use the corrected function name
      detail: {
        summary: 'Fully update (replace) a device',
        tags: ['Devices'],
        description: 'Replaces all properties of an existing device. Requires all fields (name, brand, state). Name and brand cannot be updated if the device state remains "in-use" unless the state is also changed in the same request.',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer', example: 2 }, description: 'The unique identifier of the device to replace.' }
        ],
        responses: {
          200: {
            description: 'Device updated successfully',
          },
          400: { description: 'Invalid input data (missing/invalid fields) or business rule violation' },
          404: { description: 'Device not found'},
          409: { description: 'Conflict - Updated device name already exists'},
          500: { description: 'Internal server error'}
        }
      }
    })
  // PATCH /devices/:id - Partially update a device
  .patch('/:id', deviceController.update, {
    params: paramsWithId, // Use shared ID validation schema
    detail: {
      summary: 'Partially update a device',
      tags: ['Devices'],
      description: 'Updates one or more properties of an existing device. Name and brand cannot be updated if the device state is "in-use".',
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'The unique identifier of the device to update.' }
      ],
      body: { description: 'Fields to update (name, brand, state). At least one field must be provided. Follows validation rules (min length, enums).' },
      responses: {
        200: { description: 'Device updated successfully' },
        400: { description: 'Invalid input data or business rule violation (e.g., updating name/brand while in-use, empty payload)' },
        404: { description: 'Device not found' },
        409: { description: 'Conflict - Updated device name already exists for another device' },
        500: { description: 'Internal server error' }
      }
    }
  })
  // DELETE /devices/:id - Delete a device
  .delete('/:id', deviceController.delete, {
    params: paramsWithId, // Use shared ID validation schema
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