/**
 * @require Constants
 * @require Events
 */
(function () {
  var ns = $.namespace('pskl');
  /**
   * Main application controller
   */
  ns.app = {

    destroy: function () {

      // 停止loop
      window.loopFlag = true;
      this.drawingLoop.destroy();

      // 底部list
      var e = document.querySelector('#preview-list');
      var child = e.lastElementChild;
      while (child) {
        e.removeChild(child);
        child = e.lastElementChild;
      }

      // 删除迷你区域的 canvas
      document.querySelector('.background-image-frame-container').remove();

      // 删除画布的canvas
      // canvas-overlay
      document.querySelector('.canvas-overlay').remove();
      document.querySelector('.layers-above-canvas').remove();
      document.querySelector('.onion-skin-canvas').remove();
      document.querySelector('.layers-below-canvas').remove();
      document.querySelector('.drawing-canvas').remove();


      var intel = ['init', 'destroy', 'loadPiskel_', 'render', 'getFirstFrameAsPng', 'getFramesheetAsPng'];
      Object.keys(pskl.app).forEach(v => {
        if (!intel.includes(v)) {
          delete pskl.app[v];
        }
      });

    },

    init : function (piskelName) {
      /**
       * When started from APP Engine, appEngineToken_ (Boolean) should be set on window.pskl
       */
      this.isAppEngineVersion = !!pskl.appEngineToken_;

      // This id is used to keep track of sessions in the BackupService.
      this.sessionId = pskl.utils.Uuid.generate();

      this.shortcutService = new pskl.service.keyboard.ShortcutService();
      this.shortcutService.init();

      var size = pskl.UserSettings.get(pskl.UserSettings.DEFAULT_SIZE);
      var fps = Constants.DEFAULT.FPS;
      var descriptor = new pskl.model.piskel.Descriptor(piskelName || 'New Piskel', '');
      var piskel = new pskl.model.Piskel(size.width, size.height, fps, descriptor);

      var layer = new pskl.model.Layer('Layer 1');
      var frame = new pskl.model.Frame(size.width, size.height);

      layer.addFrame(frame);
      piskel.addLayer(layer);

      this.corePiskelController = new pskl.controller.piskel.PiskelController(piskel);
      this.corePiskelController.init();

      this.piskelController = new pskl.controller.piskel.PublicPiskelController(this.corePiskelController);
      this.piskelController.init();

      this.paletteImportService = new pskl.service.palette.PaletteImportService();
      this.paletteImportService.init();

      this.paletteService = new pskl.service.palette.PaletteService();
      this.paletteService.addDynamicPalette(new pskl.service.palette.CurrentColorsPalette());

      this.selectedColorsService = new pskl.service.SelectedColorsService();
      this.selectedColorsService.init();

      this.mouseStateService = new pskl.service.MouseStateService();
      this.mouseStateService.init();


      this.currentColorsService = new pskl.service.CurrentColorsService(this.piskelController);
      this.currentColorsService.init();


      this.drawingController = new pskl.controller.DrawingController(
        this.piskelController,
        document.querySelector('#drawing-canvas-container'));
      this.drawingController.init();

      this.previewController = new pskl.controller.preview.PreviewController(
        this.piskelController,
        document.querySelector('#animated-preview-canvas-container'));
      this.previewController.init();

      this.framesListController = new pskl.controller.FramesListController(
        this.piskelController,
        document.querySelector('#preview-list-wrapper'));
      this.framesListController.init();


      this.toolController = new pskl.controller.ToolController();
      this.toolController.init();

      this.selectionManager = new pskl.selection.SelectionManager(this.piskelController);
      this.selectionManager.init();

      this.historyService = new pskl.service.HistoryService(this.piskelController);
      this.historyService.init();

      this.notificationController = new pskl.controller.NotificationController();
      this.notificationController.init();

      this.canvasBackgroundController = new pskl.controller.CanvasBackgroundController();
      this.canvasBackgroundController.init();

      this.indexedDbStorageService = new pskl.service.storage.IndexedDbStorageService(this.piskelController);
      this.indexedDbStorageService.init();

      this.localStorageService = new pskl.service.storage.LocalStorageService(this.piskelController);
      this.localStorageService.init();

      this.fileDownloadStorageService = new pskl.service.storage.FileDownloadStorageService(this.piskelController);
      this.fileDownloadStorageService.init();

      this.desktopStorageService = new pskl.service.storage.DesktopStorageService(this.piskelController);
      this.desktopStorageService.init();

      this.galleryStorageService = new pskl.service.storage.GalleryStorageService(this.piskelController);
      this.galleryStorageService.init();

      this.storageService = new pskl.service.storage.StorageService(this.piskelController);
      this.storageService.init();

      // 好像没有用
      // this.importService = new pskl.service.ImportService(this.piskelController);
      // this.importService.init();

      this.imageUploadService = new pskl.service.ImageUploadService();
      this.imageUploadService.init();

      this.savedStatusService = new pskl.service.SavedStatusService(
        this.piskelController,
        this.historyService);
      this.savedStatusService.init();

      this.backupService = new pskl.service.BackupService(this.piskelController);
      this.backupService.init();

      // this.beforeUnloadService = new pskl.service.BeforeUnloadService(this.piskelController);
      // this.beforeUnloadService.init();

      this.penSizeService = new pskl.service.pensize.PenSizeService();
      this.penSizeService.init();

      // this.penSizeController = new pskl.controller.PenSizeController();
      // this.penSizeController.init();

      this.fileDropperService = new pskl.service.FileDropperService(this.piskelController);
      this.fileDropperService.init();


      this.performanceReportService = new pskl.service.performance.PerformanceReportService(
        this.piskelController,
        this.currentColorsService);
      this.performanceReportService.init();

      this.clipboardService = new pskl.service.ClipboardService(this.piskelController);
      this.clipboardService.init();

      this.drawingLoop = new pskl.rendering.DrawingLoop();
      window.test = false;
      this.drawingLoop.addCallback(this.render, this);
      this.drawingLoop.start();


      if (pskl.devtools) {
        pskl.devtools.init();
      }
    },

    loadPiskel_ : function (piskelData) {
      var serializedPiskel = piskelData.piskel;
      pskl.utils.serialization.Deserializer.deserialize(serializedPiskel, function (piskel) {
        pskl.app.piskelController.setPiskel(piskel);
        $.publish(Events.PISKEL_SAVED);
        if (piskelData.descriptor) {
          // Backward compatibility for v2 or older
          piskel.setDescriptor(piskelData.descriptor);
        }
      });
    },


    render : function (delta) {
      this.drawingController.render(delta);
      this.previewController.render(delta);
      this.framesListController.render(delta);
    },

    getFirstFrameAsPng : function () {
      var frame = pskl.utils.LayerUtils.mergeFrameAt(this.piskelController.getLayers(), 0);
      var canvas;
      if (frame instanceof pskl.model.frame.RenderedFrame) {
        canvas = pskl.utils.CanvasUtils.createFromImage(frame.getRenderedFrame());
      } else {
        canvas = pskl.utils.FrameUtils.toImage(frame);
      }
      return canvas.toDataURL('image/png');
    },

    getFramesheetAsPng : function () {
      var renderer = new pskl.rendering.PiskelRenderer(this.piskelController);
      var framesheetCanvas = renderer.renderAsCanvas();
      return framesheetCanvas.toDataURL('image/png');
    }
  };
})();

