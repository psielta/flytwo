package api

import (
	"gobid/internal/jsonutils"
	"gobid/internal/logger"
	"net/http"

	"go.uber.org/zap"
)

// handleImportCatmat godoc
// @Summary Importa planilha CATMAT (XLSX)
// @Description Faz upsert dos itens da planilha para a tabela catmat_item
// @Tags catmat
// @Accept mpfd
// @Produce json
// @Param file formData file true "Arquivo .xlsx com colunas do CATMAT"
// @Success 200 {object} services.ImportResult
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /catmat/import [post]
func (api *Api) handleImportCatmat(w http.ResponseWriter, r *http.Request) {
	if api.CatalogService == nil {
		logger.Log.Error("CatalogService não configurado")
		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "serviço de importação indisponível",
		})
		return
	}

	if err := r.ParseMultipartForm(64 << 20); err != nil {
		logger.Log.Warn("falha ao parsear multipart", zap.Error(err))
		_ = jsonutils.EncodeJson(w, r, http.StatusBadRequest, map[string]any{
			"error": "formato multipart inválido",
		})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		_ = jsonutils.EncodeJson(w, r, http.StatusBadRequest, map[string]any{
			"error": "campo 'file' é obrigatório",
		})
		return
	}
	defer file.Close()

	logger.Log.Info("Iniciando importação CATMAT", zap.String("filename", header.Filename))

	result, err := api.CatalogService.ImportCatmat(r.Context(), file)
	if err != nil {
		logger.Log.Error("Erro ao importar CATMAT", zap.Error(err))
		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "não foi possível importar a planilha CATMAT",
		})
		return
	}

	_ = jsonutils.EncodeJson(w, r, http.StatusOK, result)
}

// handleImportCatser godoc
// @Summary Importa planilha CATSER (XLSX)
// @Description Faz upsert dos itens da planilha para a tabela catser_item
// @Tags catser
// @Accept mpfd
// @Produce json
// @Param file formData file true "Arquivo .xlsx com colunas do CATSER"
// @Success 200 {object} services.ImportResult
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /catser/import [post]
func (api *Api) handleImportCatser(w http.ResponseWriter, r *http.Request) {
	if api.CatalogService == nil {
		logger.Log.Error("CatalogService não configurado")
		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "serviço de importação indisponível",
		})
		return
	}

	if err := r.ParseMultipartForm(64 << 20); err != nil {
		logger.Log.Warn("falha ao parsear multipart", zap.Error(err))
		_ = jsonutils.EncodeJson(w, r, http.StatusBadRequest, map[string]any{
			"error": "formato multipart inválido",
		})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		_ = jsonutils.EncodeJson(w, r, http.StatusBadRequest, map[string]any{
			"error": "campo 'file' é obrigatório",
		})
		return
	}
	defer file.Close()

	logger.Log.Info("Iniciando importação CATSER", zap.String("filename", header.Filename))

	result, err := api.CatalogService.ImportCatser(r.Context(), file)
	if err != nil {
		logger.Log.Error("Erro ao importar CATSER", zap.Error(err))
		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "não foi possível importar a planilha CATSER",
		})
		return
	}

	_ = jsonutils.EncodeJson(w, r, http.StatusOK, result)
}
