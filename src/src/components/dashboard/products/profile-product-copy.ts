export type ProductLanguage = 'en' | 'es';

export const productCopy = {
  en: {
    actions: {
      add: 'Add product',
      apply: 'Apply import',
      cancel: 'Cancel',
      delete: 'Delete',
      deleteSelected: 'Delete selected',
      downloadTemplate: 'Download template',
      draft: 'Move to draft',
      edit: 'Edit',
      import: 'Import CSV',
      publish: 'Publish',
      save: 'Save product',
      setDestination: 'Set destination',
      viewPublic: 'View public product',
    },
    bulk: {
      destinationTitle: 'Update destination for {{count}} products',
      selected: '{{count}} selected',
    },
    confirmDelete: {
      body: 'This removes the product and its uploaded image. This action cannot be undone.',
      title: 'Delete {{name}}?',
    },
    confirmBulkDelete: {
      body: 'Products selected for deletion: {{count}}. Their uploaded images will also be removed. This action cannot be undone.',
      title: 'Delete selected products?',
    },
    destination: {
      countryCode: 'Country code',
      external: 'Store link',
      externalUrl: 'Product URL',
      phone: 'Phone number',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
    },
    empty: 'No products have been added yet.',
    errors: {
      description: 'Enter a description of up to 2,000 characters.',
      destinationUrl: 'Enter a valid HTTP or HTTPS product URL.',
      generic: 'Could not complete the product operation.',
      bulkDeletePartial:
        'Some products could not be deleted. The list was refreshed; try again with the products that remain.',
      image: 'Choose a JPG, PNG, WEBP, or GIF image.',
      name: 'Enter a product name of up to 180 characters.',
      phone: 'Enter a valid country code and phone number.',
    },
    fields: {
      actions: 'Actions',
      description: 'Description',
      destination: 'Destination',
      image: 'Image',
      name: 'Product',
      status: 'Status',
      updated: 'Updated',
    },
    form: {
      addTitle: 'Add product',
      editTitle: 'Edit product',
      imageHelp: 'JPG, PNG, WEBP, or GIF. Maximum 10 MB.',
      messagePreview: 'Message preview',
    },
    import: {
      actions: {
        import: 'Import',
        replace: 'Replace existing',
        skip: 'Skip',
      },
      available: '{{count}} new product slots available.',
      choose: 'Choose CSV file',
      conflict: 'Duplicate',
      duplicateExisting: 'Matches the existing product “{{name}}”.',
      duplicateFile: 'Duplicates CSV row {{row}}.',
      help: 'Review every duplicate and choose which rows to keep. Invalid rows cannot be imported.',
      invalid: 'Invalid row',
      limit:
        'The profile can keep at most {{max}} products. Choose which valid rows to import; the rest will be skipped.',
      requirements: 'Required columns: name, description, image and link. New products are imported as drafts.',
      row: 'Row {{row}}',
      summary: '{{valid}} valid · {{duplicates}} duplicates · {{invalid}} invalid',
      title: 'Import products from CSV',
    },
    intro: {
      description:
        'Manage up to {{max}} products. Only published products can appear naturally in profile conversations when recommendations are enabled.',
      title: 'Products',
      usage: '{{count}} of {{total}} products',
    },
    settings: {
      confirmDisable:
        'Products will remain saved, but the profile will stop showing product cards or recommending them in conversations.',
      confirmEnable:
        'Published products may be recommended when they are relevant to a visitor’s question. Draft products remain hidden.',
      confirmActionDisable: 'Disable recommendations',
      confirmActionEnable: 'Enable recommendations',
      confirmTitleDisable: 'Disable product recommendations?',
      confirmTitleEnable: 'Enable product recommendations?',
      disabled: 'Recommendations disabled',
      enabled: 'Recommendations enabled',
      label: 'Use products in conversations',
    },
    status: {
      draft: 'Draft',
      published: 'Public',
    },
    toasts: {
      bulkDestination: 'Destination updated',
      bulkDeleted: 'Products deleted: {{count}}',
      bulkStatus: 'Product status updated',
      created: 'Product created',
      deleted: 'Product deleted',
      imported: '{{created}} created, {{replaced}} replaced, {{skipped}} skipped',
      settings: 'Conversation setting updated',
      updated: 'Product updated',
    },
  },
  es: {
    actions: {
      add: 'Agregar producto',
      apply: 'Aplicar importación',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      deleteSelected: 'Eliminar seleccionados',
      downloadTemplate: 'Descargar plantilla',
      draft: 'Mover a borrador',
      edit: 'Editar',
      import: 'Importar CSV',
      publish: 'Publicar',
      save: 'Guardar producto',
      setDestination: 'Cambiar destino',
      viewPublic: 'Ver producto público',
    },
    bulk: {
      destinationTitle: 'Actualizar destino de {{count}} productos',
      selected: '{{count}} seleccionados',
    },
    confirmDelete: {
      body: 'Esto elimina el producto y su imagen cargada. Esta acción no se puede deshacer.',
      title: '¿Eliminar {{name}}?',
    },
    confirmBulkDelete: {
      body: 'Productos seleccionados que se eliminarán: {{count}}. También se eliminarán sus imágenes cargadas. Esta acción no se puede deshacer.',
      title: '¿Eliminar los productos seleccionados?',
    },
    destination: {
      countryCode: 'Indicativo',
      external: 'Link de tienda',
      externalUrl: 'URL del producto',
      phone: 'Número de teléfono',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
    },
    empty: 'Aún no has agregado productos.',
    errors: {
      description: 'Ingresa una descripción de máximo 2.000 caracteres.',
      destinationUrl: 'Ingresa una URL de producto HTTP o HTTPS válida.',
      generic: 'No se pudo completar la operación de productos.',
      bulkDeletePartial:
        'Algunos productos no se pudieron eliminar. La lista se actualizó; intenta nuevamente con los productos restantes.',
      image: 'Selecciona una imagen JPG, PNG, WEBP o GIF.',
      name: 'Ingresa un nombre de máximo 180 caracteres.',
      phone: 'Ingresa un indicativo y número de teléfono válidos.',
    },
    fields: {
      actions: 'Acciones',
      description: 'Descripción',
      destination: 'Destino',
      image: 'Imagen',
      name: 'Producto',
      status: 'Estado',
      updated: 'Actualizado',
    },
    form: {
      addTitle: 'Agregar producto',
      editTitle: 'Editar producto',
      imageHelp: 'JPG, PNG, WEBP o GIF. Máximo 10 MB.',
      messagePreview: 'Vista previa del mensaje',
    },
    import: {
      actions: {
        import: 'Importar',
        replace: 'Reemplazar existente',
        skip: 'Descartar',
      },
      available: '{{count}} espacios disponibles para productos nuevos.',
      choose: 'Seleccionar archivo CSV',
      conflict: 'Duplicado',
      duplicateExisting: 'Coincide con el producto existente “{{name}}”.',
      duplicateFile: 'Duplica la fila {{row}} del CSV.',
      help: 'Revisa cada duplicado y elige qué filas conservar. Las filas inválidas no se pueden importar.',
      invalid: 'Fila inválida',
      limit:
        'El perfil puede conservar máximo {{max}} productos. Elige cuáles filas válidas importar; las demás se descartarán.',
      requirements:
        'Columnas obligatorias: nombre, descripción, imagen y link. Los productos nuevos se importan como borrador.',
      row: 'Fila {{row}}',
      summary: '{{valid}} válidos · {{duplicates}} duplicados · {{invalid}} inválidos',
      title: 'Importar productos desde CSV',
    },
    intro: {
      description:
        'Administra hasta {{max}} productos. Solo los productos públicos pueden aparecer de forma natural en las conversaciones cuando habilitas las recomendaciones.',
      title: 'Productos',
      usage: '{{count}} de {{total}} productos',
    },
    settings: {
      confirmDisable:
        'Los productos seguirán guardados, pero el perfil dejará de mostrar tarjetas o recomendarlos en sus conversaciones.',
      confirmEnable:
        'Los productos públicos podrán recomendarse cuando sean relevantes para la pregunta del visitante. Los borradores seguirán ocultos.',
      confirmActionDisable: 'Deshabilitar recomendaciones',
      confirmActionEnable: 'Habilitar recomendaciones',
      confirmTitleDisable: '¿Deshabilitar recomendaciones de productos?',
      confirmTitleEnable: '¿Habilitar recomendaciones de productos?',
      disabled: 'Recomendaciones deshabilitadas',
      enabled: 'Recomendaciones habilitadas',
      label: 'Usar productos en las conversaciones',
    },
    status: {
      draft: 'Borrador',
      published: 'Público',
    },
    toasts: {
      bulkDestination: 'Destino actualizado',
      bulkDeleted: 'Productos eliminados: {{count}}',
      bulkStatus: 'Estado de productos actualizado',
      created: 'Producto creado',
      deleted: 'Producto eliminado',
      imported: '{{created}} creados, {{replaced}} reemplazados, {{skipped}} descartados',
      settings: 'Configuración de conversación actualizada',
      updated: 'Producto actualizado',
    },
  },
} as const;

export function interpolate(template: string, values: Record<string, number | string>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}
