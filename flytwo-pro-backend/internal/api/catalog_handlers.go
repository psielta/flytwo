package api

import (
	"gobid/internal/dto"
	"gobid/internal/jsonutils"
	"gobid/internal/logger"
	"gobid/internal/services"
	"net/http"
	"strconv"

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

// handleSearchCatmat godoc
// @Summary Pesquisa itens CATMAT via full-text search
// @Description Pesquisa itens do catálogo CATMAT usando busca textual com filtros opcionais
// @Tags catmat
// @Accept json
// @Produce json
// @Param q query string false "Termo de busca"
// @Param group_code query int false "Código do grupo (2 dígitos)"
// @Param class_code query int false "Código da classe (4 dígitos)"
// @Param pdm_code query int false "Código do PDM (5 dígitos)"
// @Param ncm_code query string false "Código NCM"
// @Param limit query int false "Limite de resultados (padrão 50, máximo 100)"
// @Param offset query int false "Offset para paginação (padrão 0)"
// @Success 200 {object} dto.CatmatSearchResponse "Resultados da busca paginados"
// @Failure 401 {object} map[string]interface{} "Não autenticado"
// @Failure 500 {object} map[string]interface{} "Erro interno"
// @Security ApiKeyAuth
// @Router /catmat/search [get]
func (api *Api) handleSearchCatmat(w http.ResponseWriter, r *http.Request) {
	if api.CatalogService == nil {
		logger.Log.Error("CatalogService não configurado")
		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "serviço de busca indisponível",
		})
		return
	}

	query := r.URL.Query()

	params := services.CatmatSearchParams{
		Query:  query.Get("q"),
		Limit:  parseIntParam(query.Get("limit"), 50),
		Offset: parseIntParam(query.Get("offset"), 0),
	}

	// Parse optional filters
	if gc := query.Get("group_code"); gc != "" {
		if v, err := strconv.ParseInt(gc, 10, 16); err == nil {
			val := int16(v)
			params.GroupCode = &val
		}
	}

	if cc := query.Get("class_code"); cc != "" {
		if v, err := strconv.ParseInt(cc, 10, 32); err == nil {
			val := int32(v)
			params.ClassCode = &val
		}
	}

	if pc := query.Get("pdm_code"); pc != "" {
		if v, err := strconv.ParseInt(pc, 10, 32); err == nil {
			val := int32(v)
			params.PdmCode = &val
		}
	}

	if nc := query.Get("ncm_code"); nc != "" {
		params.NcmCode = &nc
	}

	logger.Log.Info("Pesquisando CATMAT",
		zap.String("query", params.Query),
		zap.Int32("limit", params.Limit),
		zap.Int32("offset", params.Offset))

	result, err := api.CatalogService.SearchCatmat(r.Context(), params)
	if err != nil {
		logger.Log.Error("Erro ao pesquisar CATMAT", zap.Error(err))
		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "falha na pesquisa",
		})
		return
	}

	// Convert to DTO
	response := dto.CatmatSearchResponse{
		Data:   make([]dto.CatmatSearchItem, len(result.Data)),
		Total:  result.Total,
		Limit:  result.Limit,
		Offset: result.Offset,
	}

	for i, item := range result.Data {
		response.Data[i] = dto.CatmatSearchItem{
			ID:              item.ID,
			GroupCode:       item.GroupCode,
			GroupName:       item.GroupName,
			ClassCode:       item.ClassCode,
			ClassName:       item.ClassName,
			PdmCode:         item.PdmCode,
			PdmName:         item.PdmName,
			ItemCode:        item.ItemCode,
			ItemDescription: item.ItemDescription,
			NcmCode:         item.NcmCode,
			Rank:            item.Rank,
		}
	}

	_ = jsonutils.EncodeJson(w, r, http.StatusOK, response)
}

// handleSearchCatser godoc
// @Summary Pesquisa itens CATSER via full-text search
// @Description Pesquisa itens do catálogo CATSER usando busca textual com filtros opcionais
// @Tags catser
// @Accept json
// @Produce json
// @Param q query string false "Termo de busca"
// @Param group_code query int false "Código do grupo"
// @Param class_code query int false "Código da classe"
// @Param service_code query int false "Código do serviço"
// @Param status query string false "Status (Ativo/Inativo)"
// @Param limit query int false "Limite de resultados (padrão 50, máximo 100)"
// @Param offset query int false "Offset para paginação (padrão 0)"
// @Success 200 {object} dto.CatserSearchResponse "Resultados da busca paginados"
// @Failure 401 {object} map[string]interface{} "Não autenticado"
// @Failure 500 {object} map[string]interface{} "Erro interno"
// @Security ApiKeyAuth
// @Router /catser/search [get]
func (api *Api) handleSearchCatser(w http.ResponseWriter, r *http.Request) {
	if api.CatalogService == nil {
		logger.Log.Error("CatalogService não configurado")
		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "serviço de busca indisponível",
		})
		return
	}

	query := r.URL.Query()

	params := services.CatserSearchParams{
		Query:  query.Get("q"),
		Limit:  parseIntParam(query.Get("limit"), 50),
		Offset: parseIntParam(query.Get("offset"), 0),
	}

	// Parse optional filters
	if gc := query.Get("group_code"); gc != "" {
		if v, err := strconv.ParseInt(gc, 10, 16); err == nil {
			val := int16(v)
			params.GroupCode = &val
		}
	}

	if cc := query.Get("class_code"); cc != "" {
		if v, err := strconv.ParseInt(cc, 10, 32); err == nil {
			val := int32(v)
			params.ClassCode = &val
		}
	}

	if sc := query.Get("service_code"); sc != "" {
		if v, err := strconv.ParseInt(sc, 10, 32); err == nil {
			val := int32(v)
			params.ServiceCode = &val
		}
	}

	if st := query.Get("status"); st != "" {
		params.Status = &st
	}

	logger.Log.Info("Pesquisando CATSER",
		zap.String("query", params.Query),
		zap.Int32("limit", params.Limit),
		zap.Int32("offset", params.Offset))

	result, err := api.CatalogService.SearchCatser(r.Context(), params)
	if err != nil {
		logger.Log.Error("Erro ao pesquisar CATSER", zap.Error(err))
		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "falha na pesquisa",
		})
		return
	}

	// Convert to DTO
	response := dto.CatserSearchResponse{
		Data:   make([]dto.CatserSearchItem, len(result.Data)),
		Total:  result.Total,
		Limit:  result.Limit,
		Offset: result.Offset,
	}

	for i, item := range result.Data {
		response.Data[i] = dto.CatserSearchItem{
			ID:                  item.ID,
			MaterialServiceType: item.MaterialServiceType,
			GroupCode:           item.GroupCode,
			GroupName:           item.GroupName,
			ClassCode:           item.ClassCode,
			ClassName:           item.ClassName,
			ServiceCode:         item.ServiceCode,
			ServiceDescription:  item.ServiceDescription,
			Status:              item.Status,
			Rank:                item.Rank,
		}
	}

	_ = jsonutils.EncodeJson(w, r, http.StatusOK, response)
}

// parseIntParam parses an integer query parameter with a default value
func parseIntParam(value string, defaultVal int32) int32 {
	if value == "" {
		return defaultVal
	}
	v, err := strconv.ParseInt(value, 10, 32)
	if err != nil {
		return defaultVal
	}
	return int32(v)
}
